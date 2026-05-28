import { Text, View } from 'react-native';

interface StatBadgeProps {
  label: string;
  value: string | number;
  color?: string;
}

export function StatBadge({ label, value, color = '#8b949e' }: StatBadgeProps) {
  return (
    <View
      style={{
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        marginRight: 4,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
      }}
    >
      <Text style={{ color, fontSize: 13, fontWeight: '800', letterSpacing: 0.2 }}>
        {value}
      </Text>
      <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '700', marginTop: 1, letterSpacing: 1 }}>
        {label.toUpperCase()}
      </Text>
    </View>
  );
}
