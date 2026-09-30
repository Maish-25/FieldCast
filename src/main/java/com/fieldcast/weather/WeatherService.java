package com.fieldcast.weather;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import tools.jackson.databind.JsonNode;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.UriComponentsBuilder;

@Service
public class WeatherService {
	private static final String PROVIDER_URL = "https://api.open-meteo.com/v1/forecast";
	private final RestClient restClient;

	public WeatherService() {
		this.restClient = RestClient.create();
	}

	public WeatherGridResponse getGrid(double latitude, double longitude, int radiusKilometers, LocalDate forecastDate) {
		List<GridPoint> points = WeatherGrid.around(latitude, longitude, radiusKilometers);
		String latitudes = points.stream().map(point -> Double.toString(point.latitude())).collect(Collectors.joining(","));
		String longitudes = points.stream().map(point -> Double.toString(point.longitude())).collect(Collectors.joining(","));
		int forecastDays = (int) ChronoUnit.DAYS.between(LocalDate.now(ZoneOffset.UTC), forecastDate) + 1;
		var uri = UriComponentsBuilder.fromUriString(PROVIDER_URL)
			.queryParam("latitude", latitudes)
			.queryParam("longitude", longitudes)
			.queryParam("hourly", "temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,cloud_cover,wind_speed_10m,wind_direction_10m")
			.queryParam("forecast_days", forecastDays)
			.queryParam("timezone", "auto")
			.build()
			.encode()
			.toUri();

		try {
			JsonNode response = restClient.get().uri(uri).retrieve().body(JsonNode.class);
			if (response == null) {
				throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Weather provider returned an empty response");
			}
			JsonNode locations = response.isArray() ? response : response.deepCopy();
			var cells = new java.util.ArrayList<WeatherCell>(points.size());
			for (int index = 0; index < points.size(); index++) {
				JsonNode location = locations.isArray() ? locations.path(index) : locations;
				JsonNode hourly = location.path("hourly");
				GridPoint point = points.get(index);
				cells.add(new WeatherCell(point.latitude(), point.longitude(), forecastsForDate(hourly, forecastDate)));
			}
			return new WeatherGridResponse(latitude, longitude, radiusKilometers, forecastDate, Instant.now(), "Open-Meteo", cells);
		} catch (RestClientException exception) {
			throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Weather provider is unavailable", exception);
		}
	}

	private static List<HourlyForecast> forecastsForDate(JsonNode hourly, LocalDate forecastDate) {
		JsonNode times = hourly.path("time");
		if (!times.isArray()) {
			throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Weather provider returned no hourly forecast");
		}
		var forecasts = new ArrayList<HourlyForecast>(24);
		for (int index = 0; index < times.size(); index++) {
			String time = times.path(index).asText();
			if (time.startsWith(forecastDate + "T")) {
				forecasts.add(new HourlyForecast(
					Integer.parseInt(time.substring(11, 13)),
					number(hourly, "temperature_2m", index),
					number(hourly, "precipitation", index),
					integer(hourly, "precipitation_probability", index),
					integer(hourly, "relative_humidity_2m", index),
					integer(hourly, "cloud_cover", index),
					number(hourly, "wind_speed_10m", index),
					integer(hourly, "wind_direction_10m", index)
				));
			}
		}
		if (forecasts.isEmpty()) {
			throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Weather provider returned no data for the selected date");
		}
		return List.copyOf(forecasts);
	}

	private static Double number(JsonNode parent, String field, int index) {
		JsonNode value = parent.path(field).path(index);
		return value.isNumber() ? value.doubleValue() : null;
	}

	private static Integer integer(JsonNode parent, String field, int index) {
		JsonNode value = parent.path(field).path(index);
		return value.isNumber() ? value.intValue() : null;
	}
}