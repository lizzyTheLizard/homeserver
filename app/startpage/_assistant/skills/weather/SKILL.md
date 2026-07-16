---
name: weather
description: Use this skill for getting weather forecasts and details (e.g. Get Todays Weather Details, Get Weekly Forecast, What about tomorrow?).
---

# Weather Details

Trigger: user asks for "Get Todays Weather Details", "What's the weather like?", "Weather details for tomorrow", or asks for weather information for a specific day and location.

1. Identify the target date:
   - If not specified, use today's date.
   - If a relative date is mentioned (e.g., "tomorrow", "in 3 days"), calculate the actual date.
2. Resolve the location:
   - If the user has provided a location, use it.
   - If no location is provided, use the current location.
   - If only a location name is provided without coordinates, call `get_location_by_name` to fetch the coordinates.
3. Call `get_detailed_weather` with the date and location coordinates.
4. Use the template from DAILY.md to format and present the weather details.
5. Include practical advice about clothing and activities based on the weather conditions.

## Example Output
```text
Here's the Weather Forecast for **Berlin** on **16.07.2026**

In the morning it is **Partly Cloudy and 18°C**. During the day, the temperature will rise to **26°C** and drop to **16°C** in the evening. The sun will rise at **05:12** and set at **21:18**.

**Precipitation**: There is a low chance of rain.

**Wind**: Light winds from the northwest.

**Recommendation**: It's a great day for a walk or outdoor activities—t-shirt and light pants should be comfortable!
```

## Next Actions
If asked for the next actions after the weather details:
   - Get Weekly Forecast for {location}
   - Get Weather Details for {next day}
Return only short action commands with no explanations. Follow the output format requested by the caller.


# Weather Forecast

Trigger: user asks for "Get Weekly Forecast", "What's the weather like next week?", or asks for a multi-day weather forecast.

1. Resolve the location (same logic as Weather Details).
2. Call `get_weather_forecast` to retrieve the 7-day forecast for the location.
3. Use the template from WEEKLY.md to format and present the weekly forecast.
4. Highlight notable patterns (e.g., rain expected mid-week, temperature extremes).
5. Provide a brief summary of what to expect for the week.

## Example Output
```text
Here's the Weekly Forecast for **Berlin** from **16.07.2026** to **22.07.2026**

Next week in Berlin will be mostly pleasant with temperatures ranging from 16°C to 28°C. Wednesday may bring rain in the afternoon, so keep an eye on the forecast if you have outdoor plans.

* On Tuesday, 16.07.2026: Partly Cloudy with temperatures **18-26°C**
* On Wednesday, 17.07.2026: Rainy with temperatures **16-22°C**
* On Thursday, 18.07.2026: Sunny with temperatures **17-28°C**
* On Friday, 19.07.2026: Sunny with temperatures **19-27°C**
* On Saturday, 20.07.2026: Partly Cloudy with temperatures **18-25°C**
* On Sunday, 21.07.2026: Cloudy with temperatures **17-23°C**
* On Monday, 22.07.2026: Rainy with temperatures **16-20°C**

A typical summer week with a mix of sun and occasional rain. Perfect for planning outdoor activities on the sunny days!
```

## Next Actions
If asked for the next actions after the weekly forecast:
   - Get Weather Details for Today
   - Get Weather Details for {specificDay}
Return only short action commands with no explanations. Follow the output format requested by the caller.


# Important Rules

- Never use cached weather data, always fetch the latest data from the API.
- Use the current location if the user does not specify a location.
- All dates should be formatted as DD.MM.YYYY in the output.
- If weather data is unavailable for a location or date, inform the user clearly.
- Provide actionable advice based on weather conditions (e.g., clothing recommendations, umbrella warnings).
- Never make up weather data—only use data from API responses.

