---
name: weather
description: Use this skill for getting weather forecasts and details (e.g. Get Todays Weather Details, Get Weekly Forecast, What about tomorrow?).
---

# Workflow

Check if you have the needed data from the previous conversation. If not:
- Use `get_detailed_weather` and `get_weather_forecast` to get the required information.
- If the user has not provided a location, use the current location.
- If the user has provided a location without coordinates, use `get_location_by_name` to fetch the coordinates.

If you have the needed data, use the template from DAILY.md or WEEKLY.md to provide the weather forecast to the user. If needed, you can also create a combination of both.

