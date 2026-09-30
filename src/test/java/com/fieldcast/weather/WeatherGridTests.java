package com.fieldcast.weather;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class WeatherGridTests {
	@Test
	void createsLocalSamplesInsideSelectableRadii() {
		var points = WeatherGrid.around(28.6139, 77.2090, 5);
		var widerPoints = WeatherGrid.around(28.6139, 77.2090, 10);

		assertEquals(13, points.size());
		assertEquals(13, widerPoints.size());
		assertTrue(points.stream().anyMatch(point -> Math.abs(point.latitude() - 28.6139) < 0.000001
			&& Math.abs(point.longitude() - 77.2090) < 0.000001));
		assertTrue(widerPoints.stream().anyMatch(point -> Math.abs(point.latitude() - 28.6139) < 0.000001
			&& Math.abs(point.longitude() - 77.2090) < 0.000001));
		assertEquals(10.0 / 111.32, points.stream().mapToDouble(GridPoint::latitude).max().orElseThrow()
			- points.stream().mapToDouble(GridPoint::latitude).min().orElseThrow(), 0.000001);
		assertEquals(20.0 / 111.32, widerPoints.stream().mapToDouble(GridPoint::latitude).max().orElseThrow()
			- widerPoints.stream().mapToDouble(GridPoint::latitude).min().orElseThrow(), 0.000001);
		assertTrue(points.stream().allMatch(point -> distanceKilometers(point, 28.6139, 77.2090) <= 5.001));
		assertTrue(widerPoints.stream().allMatch(point -> distanceKilometers(point, 28.6139, 77.2090) <= 10.001));
	}

	@Test
	void wrapsLongitudesAtTheInternationalDateLine() {
		var points = WeatherGrid.around(0, 179.99);

		assertTrue(points.stream().allMatch(point -> point.longitude() >= -180 && point.longitude() <= 180));
		assertTrue(points.stream().anyMatch(point -> point.longitude() < 0));
	}

	private static double distanceKilometers(GridPoint point, double latitude, double longitude) {
		double latitudeDistance = (point.latitude() - latitude) * 111.32;
		double longitudeDistance = (point.longitude() - longitude) * 111.32 * Math.cos(Math.toRadians(latitude));
		return Math.hypot(latitudeDistance, longitudeDistance);
	}
}