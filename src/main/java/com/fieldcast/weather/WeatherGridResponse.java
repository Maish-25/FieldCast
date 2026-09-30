package com.fieldcast.weather;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public record WeatherGridResponse(
	double centerLatitude,
	double centerLongitude,
	int radiusKilometers,
	LocalDate forecastDate,
	Instant fetchedAt,
	String provider,
	List<WeatherCell> cells
) {
}