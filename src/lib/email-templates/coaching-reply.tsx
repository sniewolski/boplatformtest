import * as React from 'react'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'
import { COACHING_CHAT_URL, COACHING_REPLY_SUBJECT } from '../email/coachingReply'

interface CoachingReplyEmailProps {
  senderFirstName?: string | null
  preview?: string
  chatUrl?: string
}

export const CoachingReplyEmail = ({
  senderFirstName,
  preview,
  chatUrl = COACHING_CHAT_URL,
}: CoachingReplyEmailProps) => {
  const who = senderFirstName?.trim() || 'Someone from the team'
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{who} replied to you in Sales Lab</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>New message</Heading>
          <Text style={text}>{who} replied to you in Sales Lab.</Text>
          {preview ? (
            <Section style={quoteBox}>
              <Text style={quote}>{preview}</Text>
            </Section>
          ) : null}
          <Button style={button} href={chatUrl}>
            Open your chat
          </Button>
        </Container>
      </Body>
    </Html>
  )
}

export default CoachingReplyEmail

export const template = {
  component: CoachingReplyEmail,
  subject: COACHING_REPLY_SUBJECT,
  displayName: 'Coaching reply',
  previewData: {
    senderFirstName: 'Will',
    preview:
      'Great progress this week. Before our next call, could you pull together the numbers from your last ten sales conversations? I want to see where deals are stalling.',
  },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily: 'Arial, sans-serif',
}

const container = {
  padding: '40px 32px',
  maxWidth: '480px',
}

const heading = {
  fontSize: '24px',
  fontWeight: '600' as const,
  color: '#1a1a1a',
  margin: '0 0 16px',
  letterSpacing: '-0.02em',
}

const text = {
  fontSize: '15px',
  color: '#555555',
  lineHeight: '1.6',
  margin: '0 0 20px',
}

const quoteBox = {
  backgroundColor: '#f8f8f8',
  borderLeft: '4px solid #c53030',
  borderRadius: '8px',
  padding: '16px 20px',
  margin: '0 0 24px',
}

const quote = {
  fontSize: '15px',
  color: '#1a1a1a',
  lineHeight: '1.6',
  margin: '0',
  whiteSpace: 'pre-wrap' as const,
}

const button = {
  backgroundColor: '#c53030',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '600' as const,
  borderRadius: '8px',
  padding: '12px 20px',
  textDecoration: 'none',
}
