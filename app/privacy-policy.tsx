import { ScrollView, Text, TouchableOpacity, View, StatusBar } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const LAST_UPDATED = 'May 28, 2026';
const VERSION = '1.1';

// ─── Section component ────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 28 }}>
      <Text
        style={{
          color: '#FF7828',
          fontSize: 13,
          fontWeight: '800',
          letterSpacing: 1,
          marginBottom: 10,
          textTransform: 'uppercase',
        }}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

function Body({ children }: { children: string }) {
  return (
    <Text
      style={{
        color: 'rgba(255,255,255,0.65)',
        fontSize: 14,
        lineHeight: 22,
        fontWeight: '400',
      }}
    >
      {children}
    </Text>
  );
}

function Bullet({ children }: { children: string }) {
  return (
    <View style={{ flexDirection: 'row', marginBottom: 6, paddingRight: 8 }}>
      <Text style={{ color: '#FF7828', fontSize: 14, marginRight: 10, marginTop: 1 }}>•</Text>
      <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14, lineHeight: 22, flex: 1 }}>
        {children}
      </Text>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PrivacyPolicyScreen() {
  return (
    <LinearGradient colors={['#0A0E14', '#0D1220', '#0A0E14']} style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" />

      {/* Ambient glow */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: -40,
          right: -60,
          width: 240,
          height: 240,
          borderRadius: 120,
          backgroundColor: 'rgba(255,120,40,0.08)',
          transform: [{ scaleX: 1.4 }],
        }}
      />

      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingTop: 60,
          paddingHorizontal: 20,
          paddingBottom: 16,
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(255,255,255,0.06)',
        }}
      >
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/games' as any))}
          activeOpacity={0.7}
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            backgroundColor: 'rgba(255,255,255,0.06)',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 14,
          }}
        >
          <Ionicons name="chevron-back" size={20} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: '800', letterSpacing: 2 }}>
            LEGAL
          </Text>
          <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '900', letterSpacing: -0.3 }}>
            Privacy Policy
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 28, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Effective date */}
        <View
          style={{
            backgroundColor: 'rgba(255,120,40,0.08)',
            borderRadius: 14,
            borderWidth: 1,
            borderColor: 'rgba(255,120,40,0.18)',
            padding: 14,
            marginBottom: 28,
          }}
        >
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
            Last updated: {LAST_UPDATED}
          </Text>
        </View>

        <Section title="1. Introduction">
          <Body>
            {`MLB Edge Pro ("we," "us," or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard information when you use the MLB Edge Pro mobile application (the "App"). By using the App, you agree to the practices described in this policy.`}
          </Body>
        </Section>

        <Section title="2. Information We Collect">
          <Body>{`We collect the following information:\n`}</Body>
          <Bullet>Account information you provide during registration, including your name, email address, and password.</Bullet>
          <Bullet>App preferences and settings, such as your favorite team selection.</Bullet>
          <Bullet>Usage data, including which features you interact with and how frequently.</Bullet>
          <Bullet>Device information, such as operating system version and device type, to improve compatibility.</Bullet>
          <Bullet>Prop Builder data: saved slip legs, optional wager amounts, FanDuel odds lines you enter, and win/loss outcomes you voluntarily record. This data is stored locally on your device.</Bullet>
        </Section>

        <Section title="2a. Prop Builder & Bet Slip Data">
          <Body>
            {`The Prop Builder feature allows you to save hypothetical betting slips and record their outcomes. All slip data — including player props, wager amounts, odds lines, and results — is stored locally on your device.\n\nWe may collect anonymized, aggregated win/loss outcome data to improve prediction accuracy over time. This data cannot identify you individually and is used solely for model improvement. Specifically:\n`}
          </Body>
          <Bullet>We do not collect your wager amounts or financial data on our servers.</Bullet>
          <Bullet>FanDuel odds lines you enter are stored only on your device.</Bullet>
          <Bullet>Anonymized win/loss outcomes (without any personally identifying information) may be used to improve the App's predictive models.</Bullet>
          <Bullet>You may delete all saved slips at any time by removing and reinstalling the App or clearing App storage in your device settings.</Bullet>
          <Body>{`\nRecording a slip outcome in the App does not constitute placing or settling a real bet. All actual wagering activity occurs entirely on third-party platforms.`}</Body>
        </Section>

        <Section title="3. How We Use Your Information">
          <Body>{`Your information is used to:\n`}</Body>
          <Bullet>Provide, maintain, and improve the App's features and functionality.</Bullet>
          <Bullet>Personalize your experience based on your preferences and favorite team.</Bullet>
          <Bullet>Respond to support requests and communicate important updates.</Bullet>
          <Bullet>Analyze usage trends to enhance performance and reliability.</Bullet>
          <Bullet>Improve prop prediction accuracy using anonymized, aggregated slip outcome data.</Bullet>
        </Section>

        <Section title="4. Data Storage">
          <Body>
            {`Account data and prop builder slips are stored locally on your device. We do not transmit your personal credentials or slip details to any external server. MLB game data is fetched from the official MLB Stats API (statsapi.mlb.com) and is subject to MLB's own privacy practices.`}
          </Body>
        </Section>

        <Section title="5. Third-Party Services">
          <Body>
            {`The App connects to the following third-party services to provide its core functionality:\n`}
          </Body>
          <Bullet>MLB Stats API — game schedules, scores, player stats, and lineups.</Bullet>
          <Bullet>Open-Meteo API — weather data for stadium conditions. No personal data is shared with this service.</Bullet>
          <Body>
            {`\nThese services have their own privacy policies. We encourage you to review them independently.`}
          </Body>
        </Section>

        <Section title="6. Data Security">
          <Body>
            {`We implement industry-standard security measures to protect your information. However, no method of electronic storage is 100% secure. We strive to use commercially acceptable means to protect your data, but cannot guarantee absolute security.`}
          </Body>
        </Section>

        <Section title="7. Responsible Gaming Disclaimer">
          <Body>
            {`MLB Edge Pro provides analytical insights for informational and educational purposes only. The App does not facilitate, promote, or engage in gambling or sports betting. Prediction accuracy is not guaranteed. If you choose to use our data to inform betting decisions, please do so responsibly and in accordance with your local laws and regulations.`}
          </Body>
        </Section>

        <Section title="8. Children's Privacy">
          <Body>
            {`The App is not intended for users under the age of 17. We do not knowingly collect personal information from children under 17. If you believe a child has provided us with personal data, please contact us so we can take appropriate action.`}
          </Body>
        </Section>

        <Section title="9. Your Rights">
          <Body>{`You have the right to:\n`}</Body>
          <Bullet>Access the personal data we hold about you.</Bullet>
          <Bullet>Request correction of inaccurate data.</Bullet>
          <Bullet>Delete your account and associated data at any time from within the App settings.</Bullet>
        </Section>

        <Section title="10. Changes to This Policy">
          <Body>
            {`We may update this Privacy Policy from time to time. We will notify you of significant changes by updating the "Last updated" date. Continued use of the App after changes constitutes your acceptance of the revised policy.`}
          </Body>
        </Section>

        <Section title="11. Contact Us">
          <Body>
            {`If you have questions about this Privacy Policy, please contact us at:\n\nMLB Edge Pro\nsupport@mlbedgepro.app`}
          </Body>
        </Section>

        {/* Version footer */}
        <View
          style={{
            alignItems: 'center',
            paddingTop: 20,
            borderTopWidth: 1,
            borderTopColor: 'rgba(255,255,255,0.06)',
            marginTop: 8,
          }}
        >
          <Text style={{ color: 'rgba(255,255,255,0.20)', fontSize: 12, fontWeight: '600' }}>
            MLB Edge Pro — Privacy Policy
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.15)', fontSize: 12, marginTop: 2 }}>
            Version {VERSION}
          </Text>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}
