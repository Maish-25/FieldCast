package com.fieldcast.weather;

import java.util.ArrayList;
import java.util.List;

public final class WeatherGrid {
	public static final int DEFAULT_RADIUS_KILOMETERS = 5;
	private static final int SIDE_LENGTH = 5;
	private static final double KILOMETERS_PER_DEGREE_LATITUDE = 111.32;

	private WeatherGrid() {
	}

	public static List<GridPoint> around(double latitude, double longitude) {
		return around(latitude, longitude, DEFAULT_RADIUS_KILOMETERS);
	}

	public static List<GridPoint> around(double latitude, double longitude, int radiusKilometers) {
		if (radiusKilometers != 5 && radiusKilometers != 10) {
			throw new IllegalArgumentException("radius must be 5 or 10 kilometers");
		}
		var points = new ArrayList<GridPoint>(SIDE_LENGTH * SIDE_LENGTH);
		double spacingKilometers = (double) radiusKilometers * 2 / (SIDE_LENGTH - 1);
		double latitudeStep = spacingKilometers / KILOMETERS_PER_DEGREE_LATITUDE;
		double longitudeStep = latitudeStep / Math.cos(Math.toRadians(latitude));

		for (int row = 0; row < SIDE_LENGTH; row++) {
			for (int column = 0; column < SIDE_LENGTH; column++) {
				double northSouthOffset = (row - SIDE_LENGTH / 2) * spacingKilometers;
				double eastWestOffset = (column - SIDE_LENGTH / 2) * spacingKilometers;
				if (northSouthOffset * northSouthOffset + eastWestOffset * eastWestOffset > radiusKilometers * radiusKilometers) {
					continue;
				}
				double pointLatitude = latitude + northSouthOffset / KILOMETERS_PER_DEGREE_LATITUDE;
				double pointLongitude = longitude + eastWestOffset / KILOMETERS_PER_DEGREE_LATITUDE / Math.cos(Math.toRadians(latitude));
				points.add(new GridPoint(pointLatitude, wrapLongitude(pointLongitude)));
			}
		}
		return List.copyOf(points);
	}

	private static double wrapLongitude(double longitude) {
		return ((longitude + 180) % 360 + 360) % 360 - 180;
	}
}