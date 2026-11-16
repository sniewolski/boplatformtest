/**
 * Shared transactional-email pipeline: registry lookup, suppression check,
 * unsubscribe token, render, log and enqueue onto `transactional_emails`.
 * Used by the authenticated send route and by server-side triggers (e.g. the
 * coaching reply notification). Callers authenticate first and pass a
 * service-role client.
 */
import * as React from 'react'
import { render } from 'react-email'
import type { SupabaseClient } from '@supabase/supabase-js'
import { TEMPLATES } from '@/lib/email-templates/registry'

// Configuration baked in at scaffold time
const SITE_NAME = "Sales Lab"
// SENDER_DOMAIN is the verified sender FQDN: a delegated subdomain (e.g., "notify.example.com"), or, on a
// domain registered through Lovable, the domain itself or a name under it (e.g., "example.com", "app.example.com").
// It MUST match the sender verified in Lovable's email setup.
const SENDER_DOMAIN = "notify.lab.salesman.com"
// FROM_DOMAIN is the domain shown in the From: header (e.g., "example.com").
// Can be the root domain when display_from_root is enabled — this is cosmetic only.
const FROM_DOMAIN = "lab.salesman.com"

export function redactEmail(email: string | null | undefined): string {
  if (!email) return '***'
  const [localPart, domain] = email.split('@')
  if (!localPart || !domain) return '***'
  return `${localPart[0]}***@${domain}`
}

// Generate a cryptographically random 32-byte hex token
function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export type EnqueueResult = { status: number; body: Record<string, unknown> }

export async function enqueueTransactionalEmail(
  supabase: SupabaseClient<any, any>,
  {
    templateName,
    recipientEmail,
    idempotencyKey,
    templateData = {},
  }: {
    templateName: string
    recipientEmail?: string
    idempotencyKey?: string
    templateData?: Record<string, any>
  },
): Promise<EnqueueResult> {
  const messageId = crypto.randomUUID()
  idempotencyKey = idempotencyKey || messageId

  // 1. Look up template from registry (early — needed to resolve recipient)
  const template = TEMPLATES[templateName]

  if (!template) {
    console.error('Template not found in registry', { templateName })
    return {
      status: 404,
      body: {
        error: `Template '${templateName}' not found. Available: ${Object.keys(TEMPLATES).join(', ')}`,
      },
    }
  }

  // Resolve effective recipient: template-level `to` takes precedence over
  // the caller-provided recipientEmail. This allows notification templates
  // to always send to a fixed address (e.g., site owner from env var).
  const effectiveRecipient = template.to || recipientEmail

  if (!effectiveRecipient) {
    return {
      status: 400,
      body: {
        error: 'recipientEmail is required (unless the template defines a fixed recipient)',
      },
    }
  }

  // 2. Check suppression list (fail-closed: if we can't verify, don't send)
  const { data: suppressed, error: suppressionError } = await supabase
    .from('suppressed_emails')
    .select('id')
    .eq('email', effectiveRecipient.toLowerCase())
    .maybeSingle()

  if (suppressionError) {
    console.error('Suppression check failed — refusing to send', {
      code: suppressionError.code,
      message: suppressionError.message,
      recipient_redacted: redactEmail(effectiveRecipient),
    })
    return { status: 500, body: { error: 'Failed to verify suppression status' } }
  }

  if (suppressed) {
    // Log the suppressed attempt
    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: templateName,
      recipient_email: effectiveRecipient,
      status: 'suppressed',
    })

    console.log('Email suppressed', {
      templateName,
      recipient_redacted: redactEmail(effectiveRecipient),
    })
    return { status: 200, body: { success: false, reason: 'email_suppressed' } }
  }

  // 3. Get or create unsubscribe token (one token per email address)
  const normalizedEmail = effectiveRecipient.toLowerCase()
  let unsubscribeToken: string

  // Check for existing token for this email
  const { data: existingToken, error: tokenLookupError } = await supabase
    .from('email_unsubscribe_tokens')
    .select('token, used_at')
    .eq('email', normalizedEmail)
    .maybeSingle()

  if (tokenLookupError) {
    console.error('Token lookup failed', {
      code: tokenLookupError.code,
      message: tokenLookupError.message,
      email_redacted: redactEmail(normalizedEmail),
    })
    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: templateName,
      recipient_email: effectiveRecipient,
      status: 'failed',
      error_message: 'Failed to look up unsubscribe token',
    })
    return { status: 500, body: { error: 'Failed to prepare email' } }
  }

  if (existingToken && !existingToken.used_at) {
    // Reuse existing unused token
    unsubscribeToken = existingToken.token
  } else if (!existingToken) {
    // Create new token — upsert handles concurrent inserts gracefully
    unsubscribeToken = generateToken()
    const { error: tokenError } = await supabase
      .from('email_unsubscribe_tokens')
      .upsert(
        { token: unsubscribeToken, email: normalizedEmail },
        { onConflict: 'email', ignoreDuplicates: true }
      )

    if (tokenError) {
      console.error('Failed to create unsubscribe token', {
        code: tokenError.code,
        message: tokenError.message,
      })
      await supabase.from('email_send_log').insert({
        message_id: messageId,
        template_name: templateName,
        recipient_email: effectiveRecipient,
        status: 'failed',
        error_message: 'Failed to create unsubscribe token',
      })
      return { status: 500, body: { error: 'Failed to prepare email' } }
    }

    // If another request raced us, our upsert was silently ignored.
    // Re-read to get the actual stored token.
    const { data: storedToken, error: reReadError } = await supabase
      .from('email_unsubscribe_tokens')
      .select('token')
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (reReadError || !storedToken) {
      console.error('Failed to read back unsubscribe token after upsert', {
        code: reReadError?.code,
        message: reReadError?.message,
        email_redacted: redactEmail(normalizedEmail),
      })
      await supabase.from('email_send_log').insert({
        message_id: messageId,
        template_name: templateName,
        recipient_email: effectiveRecipient,
        status: 'failed',
        error_message: 'Failed to confirm unsubscribe token storage',
      })
      return { status: 500, body: { error: 'Failed to prepare email' } }
    }
    unsubscribeToken = storedToken.token
  } else {
    // Token exists but is already used — email should have been caught by suppression check above.
    // This is a safety fallback; log and skip sending.
    console.warn('Unsubscribe token already used but email not suppressed', {
      email_redacted: redactEmail(normalizedEmail),
    })
    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: templateName,
      recipient_email: effectiveRecipient,
      status: 'suppressed',
      error_message:
        'Unsubscribe token used but email missing from suppressed list',
    })
    return { status: 200, body: { success: false, reason: 'email_suppressed' } }
  }

  // 4. Render React Email template to HTML and plain text
  const element = React.createElement(template.component, templateData)
  const html = await render(element)
  const plainText = await render(element, { plainText: true })

  // Resolve subject — supports static string or dynamic function
  const resolvedSubject =
    typeof template.subject === 'function'
      ? template.subject(templateData)
      : template.subject

  // 5. Enqueue the pre-rendered email for async processing by the dispatcher.
  // The dispatcher (process-email-queue) handles sending, retries, and rate-limit backoff.

  // Log pending BEFORE enqueue so we have a record even if enqueue crashes
  await supabase.from('email_send_log').insert({
    message_id: messageId,
    template_name: templateName,
    recipient_email: effectiveRecipient,
    status: 'pending',
  })

  const { error: enqueueError } = await supabase.rpc('enqueue_email', {
    queue_name: 'transactional_emails',
    payload: {
      message_id: messageId,
      to: effectiveRecipient,
      from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
      sender_domain: SENDER_DOMAIN,
      subject: resolvedSubject,
      html,
      text: plainText,
      purpose: 'transactional',
      label: templateName,
      idempotency_key: idempotencyKey,
      unsubscribe_token: unsubscribeToken,
      queued_at: new Date().toISOString(),
    },
  })

  if (enqueueError) {
    console.error('Failed to enqueue email', {
      code: enqueueError.code,
      message: enqueueError.message,
      templateName,
      recipient_redacted: redactEmail(effectiveRecipient),
    })

    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: templateName,
      recipient_email: effectiveRecipient,
      status: 'failed',
      error_message: 'Failed to enqueue email',
    })

    return { status: 500, body: { error: 'Failed to enqueue email' } }
  }

  console.log('Transactional email enqueued', {
    templateName,
    recipient_redacted: redactEmail(effectiveRecipient),
  })

  return { status: 200, body: { success: true, queued: true } }
}
