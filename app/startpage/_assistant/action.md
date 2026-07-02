Based on the conversation so far, list the next actions the assistant should take to help the user. 
Only list actions that are directly relevant to the users needs and can be executed with the available tools. 
Do not list more than 5 actions.
An action must be a short command, for example "Get Todays Weather", "Get Weekly Forecast", "What about tomorrow?". It should not include any explanations or additional text, only the action itself.
Do not include actions already executed. Do not include actions that are not relevant to the users needs. Do not include actions that cannot be executed with the available tools.
Return an array of strings in JSON format, for example ["Get Todays Weather", "Get Weekly Forecast"]. Do NOT fence the JSON in markdown. 
Do not return any explanations, only the array of strings. Try to come up with at least one action. If there are no relevant actions, return an empty array.