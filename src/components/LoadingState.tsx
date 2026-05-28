import { ActivityIndicator, Text, View } from 'react-native';
import { AppBackground } from './AppBackground';

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message }: LoadingStateProps) {
  return (
    <AppBackground>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#FF7828" size="large" />
        {message ? (
          <Text
            style={{
              color: 'rgba(255,255,255,0.5)',
              fontSize: 14,
              fontWeight: '600',
              textAlign: 'center',
              marginTop: 14,
              paddingHorizontal: 32,
            }}
          >
            {message}
          </Text>
        ) : null}
      </View>
    </AppBackground>
  );
}
