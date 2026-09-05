import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

export interface SpxAlertEmailProps {
  event?: string
  summary?: string
  url?: string
  mint?: string
  severity?: string
  occurredAt?: string
}

const emerald = '#10b981'
const ink = '#0b1512'

function SpxAlertEmail({
  event = 'ESCROW_CREATED',
  summary = 'escrow created on agent 7xKX…9mQw',
  url = 'https://spx402.com',
  mint = '',
  severity = 'info',
  occurredAt = '',
}: SpxAlertEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{`SPX402 alert — ${event}`}</Preview>
      <Body style={{ backgroundColor: '#f4f7f5', fontFamily: 'Manrope, Arial, sans-serif' }}>
        <Container
          style={{
            backgroundColor: '#ffffff',
            border: `1px solid #e2e8e5`,
            borderRadius: '12px',
            margin: '32px auto',
            padding: '32px',
            maxWidth: '520px',
          }}
        >
          <Text
            style={{
              color: emerald,
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '2px',
              margin: '0 0 4px',
              textTransform: 'uppercase' as const,
            }}
          >
            SPX402 · Execution Tape
          </Text>
          <Heading style={{ color: ink, fontSize: '22px', margin: '0 0 16px' }}>
            {event.replace(/_/g, ' ')}
          </Heading>
          <Section
            style={{
              backgroundColor: '#f0f5f2',
              borderLeft: `3px solid ${emerald}`,
              borderRadius: '6px',
              padding: '12px 16px',
            }}
          >
            <Text style={{ color: ink, fontSize: '15px', margin: 0 }}>{summary}</Text>
          </Section>
          {mint ? (
            <Text style={{ color: '#4a5a53', fontSize: '12px', margin: '16px 0 0', wordBreak: 'break-all' as const }}>
              Agent: {mint}
            </Text>
          ) : null}
          {severity ? (
            <Text style={{ color: '#4a5a53', fontSize: '12px', margin: '4px 0 0' }}>
              Severity: {severity}
            </Text>
          ) : null}
          {occurredAt ? (
            <Text style={{ color: '#4a5a53', fontSize: '12px', margin: '4px 0 0' }}>
              Observed: {occurredAt}
            </Text>
          ) : null}
          <Button
            href={url}
            style={{
              backgroundColor: emerald,
              borderRadius: '8px',
              color: '#ffffff',
              display: 'inline-block',
              fontSize: '14px',
              fontWeight: 700,
              marginTop: '24px',
              padding: '12px 24px',
              textDecoration: 'none',
            }}
          >
            Open dossier
          </Button>
          <Hr style={{ borderColor: '#e2e8e5', margin: '24px 0 16px' }} />
          <Text style={{ color: '#8a9790', fontSize: '11px', margin: 0 }}>
            You received this because you subscribed to alerts for this agent on spx402.com.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: SpxAlertEmail,
  subject: (d: Record<string, any>) => `SPX402 alert — ${d.event ?? 'agent event'}`,
  displayName: 'Agent alert',
  previewData: {
    event: 'BOND_SLASHED',
    summary: 'bond slashed on agent 7xKX…9mQw',
    url: 'https://spx402.com/agent/7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    mint: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    severity: 'high',
    occurredAt: '2026-09-05T11:00:00Z',
  },
} satisfies TemplateEntry
