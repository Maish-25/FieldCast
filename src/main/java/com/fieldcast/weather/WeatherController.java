package com.fieldcast.weather;

import java.time.LocalDate;
import java.time.ZoneOffset;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/weather")
public class WeatherController {
	private final WeatherService weatherService;

	public WeatherController(WeatherService weatherService) {
		this.weatherService = weatherService;
	}

	@GetMapping
	public WeatherGridResponse getWeather(
		@RequestParam double latitude,
		@RequestParam double longitude,
		@RequestParam(defaultValue = "5") int radiusKm,
		@RequestParam(required = false) LocalDate date
	) {
		if (!Double.isFinite(latitude) || latitude < -85 || latitude > 85) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "latitude must be between -85 and 85");
		}
		if (!Double.isFinite(longitude) || longitude < -180 || longitude > 180) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "longitude must be between -180 and 180");
		}
		if (radiusKm != 5 && radiusKm != 10) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "radiusKm must be 5 or 10");
		}
		LocalDate forecastDate = date == null ? LocalDate.now(ZoneOffset.UTC) : date;
		LocalDate today = LocalDate.now(ZoneOffset.UTC);
		if (forecastDate.isBefore(today) || forecastDate.isAfter(today.plusDays(6))) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "date must be within the next 7 days");
		}
		return weatherService.getGrid(latitude, longitude, radiusKm, forecastDate);
	}
}