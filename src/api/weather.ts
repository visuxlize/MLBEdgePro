import axios from 'axios';

// Open-Meteo — completely free, no API key required
const weatherApi = axios.create({
  baseURL: 'https://api.open-meteo.com/v1',
  timeout: 8000,
});

export interface WeatherData {
  temp: number;        // Fahrenheit
  windSpeed: number;   // mph
  windDeg: number;     // degrees
  humidity: number;    // percent
  description: string; // human-readable
  icon: string;        // ionicon name
  precipitation: number; // mm
}

// WMO weather code → description + Ionicons name
function decodeWMO(code: number): { description: string; icon: string } {
  if (code === 0) return { description: 'Clear sky', icon: 'sunny-outline' };
  if (code === 1) return { description: 'Mainly clear', icon: 'sunny-outline' };
  if (code === 2) return { description: 'Partly cloudy', icon: 'partly-sunny-outline' };
  if (code === 3) return { description: 'Overcast', icon: 'cloudy-outline' };
  if (code <= 49) return { description: 'Foggy', icon: 'cloud-outline' };
  if (code <= 59) return { description: 'Drizzle', icon: 'rainy-outline' };
  if (code <= 69) return { description: 'Rain', icon: 'rainy-outline' };
  if (code <= 79) return { description: 'Snow / sleet', icon: 'snow-outline' };
  if (code <= 82) return { description: 'Rain showers', icon: 'rainy-outline' };
  if (code <= 84) return { description: 'Heavy showers', icon: 'thunderstorm-outline' };
  if (code <= 94) return { description: 'Thunderstorm', icon: 'thunderstorm-outline' };
  return { description: 'Severe storm', icon: 'thunderstorm-outline' };
}

export async function fetchStadiumWeather(lat: number, lon: number): Promise<WeatherData> {
  const { data } = await weatherApi.get('/forecast', {
    params: {
      latitude: lat,
      longitude: lon,
      current: 'temperature_2m,wind_speed_10m,wind_direction_10m,relative_humidity_2m,weather_code,precipitation',
      wind_speed_unit: 'mph',
      temperature_unit: 'fahrenheit',
      forecast_days: 1,
    },
  });

  const c = data.current;
  const { description, icon } = decodeWMO(c.weather_code ?? 0);

  return {
    temp: Math.round(c.temperature_2m),
    windSpeed: Math.round(c.wind_speed_10m),
    windDeg: c.wind_direction_10m,
    humidity: c.relative_humidity_2m,
    description,
    icon,
    precipitation: c.precipitation ?? 0,
  };
}

export const fetchWeatherByStadium = fetchStadiumWeather;
