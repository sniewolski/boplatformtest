import { createClient } from '@supabase/supabase-js'
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { enqueueTransactionalEmail } from '@/lib/email/transactional'
import {
  COACHING_CHAT_URL,
  COACHING_REPLY_TEMPLATE,
  coachingReplyPreview,
  staffFirstName,
} from '@/lib/email/coachingReply'

/**
 * Pinged by the coaching_messages insert trigger (pg_net, after commit) when
 * a staff member writes in an owner's thread and the owner's 15-minute
 * throttle slot was free. The ping carries only the message id and no secret:
 * an email is queued only if coaching_notifications holds an unconsumed claim
 * for exactly this message, and the claim is consumed atomically here, so
 * replays and guessed ids send nothing.
 */
const Body = z.object({ messageId: z.string().uuid() })

/** Claims older than this are ignored (the ping normally arrives in seconds). */
const CLAIM_MAX_AGE_MS = 60 * 60_000

const ok = (body: Record<string, unknown> = { ok: true }) => Response.json(body)

export const Route = createFileRoute('/lovable/email/coaching/reply-notify')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const supabaseUrl = import.meta.env['VITE_SUPABASE_URL']
        const supabaseServiceKey = process.env['SUPABASE_SERVICE_ROLE_KEY']
        if (!supabaseUrl || !supabaseServiceKey) {
          console.error('coaching reply-notify: missing environment variables')
          return Response.json({ error: 'Server configuration error' }, { status: 500 })
        }

        let messageId: string
        try {
          messageId = Body.parse(await request.json()).messageId
        } catch {
          return Response.json({ error: 'Invalid request' }, { status: 400 })
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // Consume the one-shot claim for this message.
        const { data: claim, error: claimError } = await supabase
          .from('coaching_notifications')
          .update({ email_queued_at: new Date().toISOString() })
          .eq('last_message_id', messageId)
          .is('email_queued_at', null)
          .gt('last_notified_at', new Date(Date.now() - CLAIM_MAX_AGE_MS).toISOString())
          .select('owner_id')
          .maybeSingle()
        if (claimError) {
          console.error('coaching reply-notify: claim failed', { code: claimError.code })
          return Response.json({ error: 'Claim failed' }, { status: 500 })
        }
        if (!claim) return ok({ ok: true, skipped: true })

        const { data: message } = await supabase
          .from('coaching_messages')
          .select('id, owner_id, sender_id, body')
          .eq('id', messageId)
          .maybeSingle()
        if (!message || message.owner_id !== claim.owner_id || message.sender_id === message.owner_id) {
          return ok({ ok: true, skipped: true })
        }

        const { data: owner } = await supabase
          .from('profiles')
          .select('email, account_status')
          .eq('id', message.owner_id)
          .maybeSingle()
        if (!owner?.email || owner.account_status === 'suspended') {
          return ok({ ok: true, skipped: true })
        }

        const { data: sender } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', message.sender_id)
          .maybeSingle()

        const result = await enqueueTransactionalEmail(supabase, {
          templateName: COACHING_REPLY_TEMPLATE,
          recipientEmail: owner.email,
          idempotencyKey: `coaching-reply-${message.id}`,
          templateData: {
            senderFirstName: staffFirstName(sender?.full_name),
            preview: coachingReplyPreview(message.body),
            chatUrl: COACHING_CHAT_URL,
          },
        })
        if (result.status >= 400) {
          console.error('coaching reply-notify: enqueue failed', { status: result.status })
          return Response.json({ error: 'Enqueue failed' }, { status: 500 })
        }
        return ok({ ok: true, queued: result.body.queued === true })
      },
    },
  },
})
