package com.fieldcast.weather;

public record HourlyForecast(
	int hour,
	Double temperatureCelsius,
	Double rainfallMillimeters,
	Integer rainProbabilityPercent,
	Integer relativeHumidityPercent,
	Integer cloudCoverPercent,
	Double windSpeedKmh,
	Integer windDirectionDegrees
) {
}