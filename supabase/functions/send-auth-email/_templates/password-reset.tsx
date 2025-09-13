import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
  Section,
  Button,
} from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'

interface PasswordResetEmailProps {
  resetUrl: string
  userEmail: string
}

export const PasswordResetEmail = ({
  resetUrl,
  userEmail,
}: PasswordResetEmailProps) => (
  <Html>
    <Head />
    <Preview>Reset your ForexAlert Pro password</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Reset Your Password</Heading>
        
        <Text style={text}>
          Hi there! We received a request to reset the password for your ForexAlert Pro account 
          associated with <strong>{userEmail}</strong>.
        </Text>
        
        <Text style={text}>
          Click the button below to reset your password. This link will expire in 24 hours for security reasons.
        </Text>
        
        <Section style={buttonContainer}>
          <Button href={resetUrl} style={button}>
            Reset Password
          </Button>
        </Section>
        
        <Text style={text}>
          Or copy and paste this link into your browser:
        </Text>
        <Text style={linkText}>
          {resetUrl}
        </Text>
        
        <Text style={warningText}>
          ⚠️ <strong>Security Notice:</strong> If you didn't request this password reset, 
          please ignore this email. Your password will remain unchanged.
        </Text>
        
        <Text style={footerText}>
          For security reasons, this link will expire in 24 hours. If you need assistance, 
          please contact our support team.
        </Text>
        
        <Text style={footer}>
          Best regards,<br/>
          <strong>The ForexAlert Pro Team</strong><br/>
          Professional Forex Trading Signals
        </Text>
      </Container>
    </Body>
  </Html>
)

export default PasswordResetEmail

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  borderRadius: '8px',
  border: '1px solid #e1e8ed',
  maxWidth: '600px',
}

const h1 = {
  color: '#1a202c',
  fontSize: '24px',
  fontWeight: '700',
  margin: '40px 20px 30px 20px',
  padding: '0',
  textAlign: 'center' as const,
}

const text = {
  color: '#4a5568',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '20px 20px',
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 20px',
}

const button = {
  backgroundColor: '#e53e3e',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 28px',
  border: 'none',
  cursor: 'pointer',
}

const linkText = {
  color: '#3182ce',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '16px 20px',
  wordBreak: 'break-all' as const,
}

const warningText = {
  color: '#d69e2e',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '24px 20px',
  padding: '16px',
  backgroundColor: '#fffbeb',
  borderRadius: '6px',
  borderLeft: '4px solid #d69e2e',
}

const footerText = {
  color: '#718096',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '32px 20px 20px 20px',
}

const footer = {
  color: '#4a5568',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '20px 20px',
  textAlign: 'center' as const,
  borderTop: '1px solid #e2e8f0',
  paddingTop: '24px',
}