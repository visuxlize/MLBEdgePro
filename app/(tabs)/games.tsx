import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import GameCard from "../../src/components/GameCard";
import { TrialToast } from "../../src/components/TrialToast";
import { useGames } from "../../src/hooks/useGames";
import { useSubscription } from "../../src/hooks/useSubscription";
import { useTrialToast } from "../../src/hooks/useTrialToast";

export default function GamesScreen() {
  // ── All hooks must be called unconditionally before any early return ──────
  const {
    data: games,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useGames();

  const { isPro, isLoaded } = useSubscription();
  const { visible: trialToastVisible, dismiss: dismissTrialToast } = useTrialToast(isPro, isLoaded);

  // ── TrialToast is a Modal — render it in every branch so it can appear
  //    even while the games list is still loading ────────────────────────────
  if (isLoading) {
    return (
      <>
        <TrialToast visible={trialToastVisible} onDismiss={dismissTrialToast} />
        <View className="flex-1 bg-edge-bg items-center justify-center">
          <ActivityIndicator color="#1a8cff" size="large" />
          <Text className="text-gray-400 mt-3 text-sm">
            Loading today's slate...
          </Text>
        </View>
      </>
    );
  }

  if (isError) {
    return (
      <>
        <TrialToast visible={trialToastVisible} onDismiss={dismissTrialToast} />
        <View className="flex-1 bg-edge-bg items-center justify-center px-8">
          <Text className="text-4xl mb-4">⚠️</Text>
          <Text className="text-red-400 text-center text-base">
            {error?.message ?? "Failed to load games"}
          </Text>
          <TouchableOpacity
            onPress={() => refetch()}
            className="mt-4 bg-edge-accent px-6 py-2 rounded-lg"
          >
            <Text className="text-white font-semibold">Try Again</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  return (
    <>
      <TrialToast visible={trialToastVisible} onDismiss={dismissTrialToast} />

      <View className="flex-1 bg-edge-bg">
        {/* Header */}
        <View className="px-4 pt-14 pb-4">
          <Text className="text-gray-400 text-sm">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </Text>
          <Text className="text-white text-2xl font-bold">
            Today's Games{" "}
            <Text className="text-edge-accent">{games?.length ?? 0}</Text>
          </Text>
        </View>

        <FlatList
          data={games}
          keyExtractor={(item) => item.gamePk.toString()}
          renderItem={({ item }) => <GameCard game={item} />}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#1a8cff"
            />
          }
          ListEmptyComponent={
            <View className="items-center py-20">
              <Text className="text-gray-500">No games scheduled today</Text>
            </View>
          }
        />
      </View>
    </>
  );
}
