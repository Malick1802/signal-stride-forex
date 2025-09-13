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

interface SignupConfirmationEmailProps {
  confirmationUrl: string
  userEmail: string
}

export const SignupConfirmationEmail = ({
  confirmationUrl,
  userEmail,
}: SignupConfirmationEmailProps) => (
  <Html>
    <Head />
    <Preview>Welcome to ForexAlert Pro - Confirm your email to get started</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Welcome to ForexAlert Pro! 🚀</Heading>
        
        <Text style={text}>
          Hi there! Thank you for signing up for ForexAlert Pro with <strong>{userEmail}</strong>.
        </Text>
        
        <Text style={text}>
          You're just one step away from accessing professional Forex trading signals and analysis. 
          Please confirm your email address to activate your account.
        </Text>
        
        <Section style={buttonContainer}>
          <Button href={confirmationUrl} style={button}>
            Confirm Email Address
          </Button>
        </Section>
        
        <Text style={text}>
          Or copy and paste this link into your browser:
        </Text>
        <Text style={linkText}>
          {confirmationUrl}
        </Text>
        
        <Text style={text}>
          Once confirmed, you'll have access to:
        </Text>
        <Text style={features}>
          • Real-time Forex trading signals<br/>
          • Professional technical analysis<br/>
          • Risk management tools<br/>
          • Mobile alerts and notifications<br/>
          • Performance tracking dashboard
        </Text>
        
        <Text style={footerText}>
          If you didn't create an account with ForexAlert Pro, you can safely ignore this email.
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

export default SignupConfirmationEmail

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
  backgroundColor: '#3182ce',
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

const features = {
  color: '#4a5568',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '16px 20px',
  padding: '16px',
  backgroundColor: '#f7fafc',
  borderRadius: '6px',
  borderLeft: '4px solid #3182ce',
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