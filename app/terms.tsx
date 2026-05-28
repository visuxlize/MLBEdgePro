import { ScrollView, Text, TouchableOpacity, View, StatusBar } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const LAST_UPDATED = 'May 28, 2026';
const VERSION = '1.1';

// ─── Section helpers ──────────────────────────────────────────────────────────

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

export default function TermsOfServiceScreen() {
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
            Terms of Service
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

        <Section title="1. Acceptance of Terms">
          <Body>
            {`By downloading, installing, or using MLB Edge Pro (the "App"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the App. These Terms constitute a legally binding agreement between you and MLB Edge Pro.`}
          </Body>
        </Section>

        <Section title="2. Description of Service">
          <Body>
            {`MLB Edge Pro is a baseball analytics application that provides:\n`}
          </Body>
          <Bullet>Real-time MLB game scores, schedules, and standings.</Bullet>
          <Bullet>Player and pitcher performance statistics sourced from the official MLB Stats API.</Bullet>
          <Bullet>AI-assisted game predictions and analytical insights for informational purposes.</Bullet>
          <Bullet>Weather data to assess stadium conditions and their potential impact on games.</Bullet>
          <Bullet>A Prop Builder tool that lets users track hypothetical betting slips, log wager details, and record outcomes for personal analysis.</Bullet>
        </Section>

        <Section title="2a. Prop Builder & Slip Tracking">
          <Body>
            {`The Prop Builder feature allows you to construct hypothetical prop bet slips using model-generated probability estimates. You may optionally save slips locally on your device, record wager amounts, potential payouts, FanDuel odds lines, and mark outcomes as won or lost.\n\nThis data is stored on your device and may be used in aggregate, anonymized form to improve prediction accuracy. You acknowledge that:\n`}
          </Body>
          <Bullet>Saved slips and outcomes are stored locally on your device.</Bullet>
          <Bullet>Win/loss data you record may be used — in anonymized, aggregated form — to improve the App's predictive models.</Bullet>
          <Bullet>MLB Edge Pro is not a sportsbook and does not facilitate actual wagering. Recording a slip does not constitute placing a real bet.</Bullet>
          <Bullet>You are solely responsible for any actual bets you place on third-party platforms such as FanDuel.</Bullet>
        </Section>

        <Section title="3. Not a Gambling Platform">
          <Body>
            {`MLB Edge Pro is strictly an informational and educational analytics tool. We are NOT a sports betting platform, gambling service, or licensed gambling operator. Any analytical content provided by the App — including win predictions, edge scores, or player props — is for educational and entertainment purposes only.\n\nPredictions generated by our models are not guaranteed to be accurate. Past predictive performance does not guarantee future results. You assume full responsibility for any decisions you make based on information provided by the App.`}
          </Body>
        </Section>

        <Section title="4. User Accounts">
          <Body>
            {`To access certain features of the App, you must create an account. You agree to:\n`}
          </Body>
          <Bullet>Provide accurate and complete registration information.</Bullet>
          <Bullet>Maintain the security of your account credentials.</Bullet>
          <Bullet>Notify us immediately of any unauthorized use of your account.</Bullet>
          <Bullet>Be at least 17 years of age to create an account.</Bullet>
          <Body>{`\nYou are solely responsible for all activity that occurs under your account.`}</Body>
        </Section>

        <Section title="5. Intellectual Property">
          <Body>
            {`The App, including its design, code, logos, and content (excluding MLB statistical data), is owned by MLB Edge Pro and protected by applicable intellectual property laws. You may not copy, modify, distribute, or create derivative works without our prior written consent.\n\nMLB statistical data is provided under license from MLB Advanced Media, L.P. MLB trademarks and copyrights are the property of their respective owners.`}
          </Body>
        </Section>

        <Section title="6. Permitted Use">
          <Body>{`You agree to use the App only for lawful purposes and in accordance with these Terms. You agree not to:\n`}</Body>
          <Bullet>Use the App in any way that violates applicable local, national, or international laws.</Bullet>
          <Bullet>Reverse engineer, decompile, or attempt to extract the App's source code.</Bullet>
          <Bullet>Use automated scripts or bots to access or interact with the App.</Bullet>
          <Bullet>Resell, sublicense, or commercially exploit the App's content or data.</Bullet>
        </Section>

        <Section title="7. Disclaimer of Warranties">
          <Body>
            {`THE APP IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE APP WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF VIRUSES. ANALYTICAL PREDICTIONS AND INSIGHTS ARE PROVIDED WITHOUT ANY WARRANTY OF ACCURACY OR FITNESS FOR A PARTICULAR PURPOSE.\n\nWE EXPRESSLY DISCLAIM ALL WARRANTIES RELATED TO THE ACCURACY OF PREDICTIONS, STATISTICAL ANALYSIS, OR ANY EXPECTED OUTCOME.`}
          </Body>
        </Section>

        <Section title="8. Limitation of Liability">
          <Body>
            {`TO THE MAXIMUM EXTENT PERMITTED BY LAW, MLB EDGE PRO AND ITS AFFILIATES SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES — INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, OR GOODWILL — ARISING FROM YOUR USE OF OR INABILITY TO USE THE APP.\n\nIN NO EVENT WILL OUR TOTAL LIABILITY EXCEED THE AMOUNT YOU PAID FOR THE APP IN THE PAST TWELVE MONTHS (IF ANY).`}
          </Body>
        </Section>

        <Section title="9. Responsible Gaming">
          <Body>
            {`If you choose to use data from this App in connection with sports betting, you do so entirely at your own risk. MLB Edge Pro strongly encourages responsible gaming. If you or someone you know may have a gambling problem, contact the National Problem Gambling Helpline at 1-800-522-4700 (US) or visit ncpgambling.org.`}
          </Body>
        </Section>

        <Section title="10. Termination">
          <Body>
            {`We reserve the right to suspend or terminate your access to the App at any time, for any reason, without notice. You may delete your account at any time from within the App's Settings screen. Upon termination, your right to use the App will immediately cease.`}
          </Body>
        </Section>

        <Section title="11. Changes to Terms">
          <Body>
            {`We reserve the right to modify these Terms at any time. We will provide notice of material changes by updating the "Last updated" date. Your continued use of the App after changes take effect constitutes your acceptance of the revised Terms.`}
          </Body>
        </Section>

        <Section title="12. Governing Law">
          <Body>
            {`These Terms shall be governed by and construed in accordance with the laws of the United States, without regard to conflict of law principles. Any disputes arising from these Terms or your use of the App shall be resolved through binding arbitration.`}
          </Body>
        </Section>

        <Section title="13. Contact">
          <Body>
            {`Questions about these Terms? Contact us at:\n\nMLB Edge Pro\nsupport@mlbedgepro.app`}
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
            MLB Edge Pro — Terms of Service
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.15)', fontSize: 12, marginTop: 2 }}>
            Version {VERSION}
          </Text>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}
