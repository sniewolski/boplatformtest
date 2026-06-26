import * as React from 'react'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'

interface MagicLinkEmailProps {
  siteName: string
  token: string
}

export const MagicLinkEmail = ({ siteName, token }: MagicLinkEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your {siteName} login code</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={heading}>Your login code</Heading>
        <Text style={text}>
          Use this passcode to log in to the {siteName} platform.
        </Text>
        <Section style={codeBox}>
          <Text style={code}>{token}</Text>
        </Section>
        <Text style={footer}>
          This code will expire shortly. If you didn't request it, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

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
  margin: '0 0 24px',
}

const codeBox = {
  backgroundColor: '#f8f8f8',
  borderLeft: '4px solid #c53030',
  borderRadius: '8px',
  padding: '20px 24px',
  margin: '0 0 24px',
}

const code = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  fontSize: '32px',
  fontWeight: '600' as const,
  letterSpacing: '0.12em',
  color: '#1a1a1a',
  margin: '0',
  textAlign: 'center' as const,
}

const footer = {
  fontSize: '13px',
  color: '#888888',
  lineHeight: '1.5',
  margin: '0',
}

