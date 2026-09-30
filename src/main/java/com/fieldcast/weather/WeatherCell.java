package com.fieldcast.weather;

import java.util.List;

public record WeatherCell(
	double latitude,
	double longitude,
	List<HourlyForecast> hourlyForecast
) {
}