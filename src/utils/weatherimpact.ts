import { WeatherData } from "../api/weather";

export function getWeatherPenalty(weather: WeatherData): number {
  let penalty = 0;

  // High wind hurts HR props (unless blowing out to right field)
  if (weather.windSpeed > 15) penalty += 8;
  if (weather.windSpeed > 25) penalty += 7; // stacks

  // Cold temperatures suppress offense
  if (weather.temp < 45) penalty += 10;
  else if (weather.temp < 55) penalty += 5;

  // Rain or dome effects
  if (weather.description.includes("rain")) penalty += 12;
  if (weather.description.includes("drizzle")) penalty += 5;

  return penalty;
}

export function getWindDirection(degrees: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(degrees / 45) % 8];
}
