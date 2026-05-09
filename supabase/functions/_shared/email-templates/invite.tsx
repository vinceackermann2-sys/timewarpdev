/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
}: InviteEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You've been invited to join Timewarp</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src="https://ohvxqlxugqlzzbmfypiy.supabase.co/storage/v1/object/public/email-assets/timewarp-logo.png" alt="Timewarp" width="140" height="auto" style={logo} />
        <Heading style={h1}>You've been invited 🎉</Heading>
        <Text style={text}>
          You've been invited to join a workspace on{' '}
          <Link href={siteUrl} style={link}>
            <strong>Timewarp</strong>
          </Link>
          . Click below to accept and get started.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Accept Invitation
        </Button>
        <Text style={footer}>
          If you weren't expecting this, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Plus Jakarta Sans', Arial, sans-serif" }
const container = { padding: '40px 25px' }
const logo = { marginBottom: '24px' }
const h1 = {
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: 'hsl(215, 25%, 15%)',
  margin: '0 0 20px',
}
const text = {
  fontSize: '15px',
  color: 'hsl(215, 15%, 35%)',
  lineHeight: '1.6',
  margin: '0 0 25px',
}
const link = { color: 'hsl(210, 100%, 50%)', textDecoration: 'underline' }
const button = {
  backgroundColor: 'hsl(210, 100%, 50%)',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: '600' as const,
  borderRadius: '10px',
  padding: '14px 24px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: 'hsl(215, 15%, 55%)', margin: '30px 0 0' }
