import { ActivityIndicator, FlatList, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppBackground } from '@/src/components/AppBackground';
import { GlassCard } from '@/src/components/GlassCard';
import { TeamLogo } from '@/src/components/TeamLogo';
import { LoadingState } from '@/src/components/LoadingState';
import { useGames } from '@/src/hooks/useGames';
import { useWeather } from '@/src/hooks/useWeather';
import { getStadiumInfo } from '@/src/constants/stadiums';
import type { Game } from '@/src/api/mlb';
import { getWeatherPenalty, getWindDirection } from '@/src/utils/weatherimpact';

function impactStyle(penalty: number) {
  if (penalty <= 4) return { label: 'Good', color: '#50C882' };
  if (penalty <= 12) return { label: 'Caution', color: '#FF7828' };
  return { label: 'Avoid', color: '#EB505A' };
}

function WeatherGameRow({ game }: { game: Game }) {
  const stadiumInfo = getStadiumInfo(game.venue.id, game.venue.name);
  const { data: weather, isLoading } = useWeather(game.venue.id, game.venue.name);

  const isIndoor = stadiumInfo?.indoor === true;

  return (
    <GlassCard style={{ padding: 16, marginBottom: 12 }}>
      {/* Teams */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <TeamLogo teamId={game.teams.away.team.id} teamName={game.teams.away.team.name} size={26} />
          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '600', marginLeft: 8 }}>
            {game.teams.away.team.name}
          </Text>
        </View>
        <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, fontWeight: '700', paddingHorizontal: 8 }}>@</Text>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', flex: 1 }}>
          <TeamLogo teamId={game.teams.home.team.id} teamName={game.teams.home.team.name} size={26} />
          <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700', marginRight: 8 }}>
            {game.teams.home.team.name}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
        <Ionicons name="location-outline" size={11} color="rgba(255,255,255,0.25)" style={{ marginRight: 4 }} />
        <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11 }}>{game.venue.name}</Text>
      </View>

      {isIndoor ? (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="home-outline" size={14} color="rgba(255,255,255,0.35)" style={{ marginRight: 6 }} />
          <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>Fixed-dome venue — weather not a factor</Text>
        </View>
      ) : !stadiumInfo ? (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="cloud-offline-outline" size={14} color="rgba(255,255,255,0.35)" style={{ marginRight: 6 }} />
          <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>Weather data unavailable</Text>
        </View>
      ) : isLoading ? (
        <ActivityIndicator color="#FF7828" size="small" style={{ alignSelf: 'flex-start' }} />
      ) : weather ? (
        <>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', gap: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="thermometer-outline" size={14} color="rgba(255,255,255,0.5)" style={{ marginRight: 4 }} />
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>{weather.temp}°F</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="flag-outline" size={14} color="rgba(255,255,255,0.5)" style={{ marginRight: 4 }} />
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>
                  {weather.windSpeed} mph {getWindDirection(weather.windDeg)}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="water-outline" size={14} color="rgba(255,255,255,0.5)" style={{ marginRight: 4 }} />
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>{weather.humidity}%</Text>
              </View>
            </View>
            {(() => {
              const penalty = getWeatherPenalty(weather);
              const { label, color } = impactStyle(penalty);
              return (
                <View style={{ borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: `${color}22`, borderWidth: 1, borderColor: `${color}44` }}>
                  <Text style={{ color, fontSize: 11, fontWeight: '800' }}>{label}</Text>
                </View>
              );
            })()}
          </View>
          <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, textTransform: 'capitalize' }}>
            {weather.description}
          </Text>
        </>
      ) : (
        <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>No weather data</Text>
      )}
    </GlassCard>
  );
}

export default function WeatherScreen() {
  const { data: games, isLoading } = useGames();

  if (isLoading) return <LoadingState message="Loading weather data..." />;

  return (
    <AppBackground>
      <FlatList
        data={games ?? []}
        keyExtractor={(g) => g.gamePk.toString()}
        renderItem={({ item }) => <WeatherGameRow game={item} />}
        ListHeaderComponent={
          <View style={{ paddingHorizontal: 18, paddingTop: 60, paddingBottom: 16 }}>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '800', letterSpacing: 2, marginBottom: 4 }}>
              GAME DAY CONDITIONS
            </Text>
            <Text style={{ color: '#FFFFFF', fontSize: 28, fontWeight: '900' }}>Weather Impact</Text>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 4 }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </Text>
          </View>
        }
        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 40 }}
      />
    </AppBackground>
  );
}
