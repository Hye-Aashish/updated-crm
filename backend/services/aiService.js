const Setting = require('../models/Setting');
const axios = require('axios');

/**
 * Analyzes the lead's notes/activities using AI (OpenAI, Gemini) or heuristics.
 * Classifies priority into 'red'|'yellow'|'green' and attempts to extract
 * any future follow-up reminder date-time from the text.
 */
async function analyzeLeadPriorityAndExtractReminder(activities, clientTime = null) {
    let apiKey = null;
    let provider = 'gemini';

    // 1. Try to fetch from Settings database
    try {
        const settings = await Setting.findOne();
        if (settings?.apiKeys?.openai) {
            apiKey = settings.apiKeys.openai;
            provider = 'openai';
        } else if (settings?.apiKeys?.gemini) {
            apiKey = settings.apiKeys.gemini;
            provider = 'gemini';
        }
    } catch (e) {
        console.error('AI Service Settings Lookup Error:', e);
    }

    // 2. Fallback to Environment Variables
    if (!apiKey) {
        if (process.env.OPENAI_API_KEY) {
            apiKey = process.env.OPENAI_API_KEY;
            provider = 'openai';
        } else if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here') {
            apiKey = process.env.GEMINI_API_KEY;
            provider = 'gemini';
        }
    }

    // Clean activities log representation
    const notesText = (activities || [])
        .map(act => `[${new Date(act.createdAt).toLocaleString()}] (${act.type}): ${act.content}`)
        .join('\n');

    const currentTimeString = clientTime 
        ? new Date(clientTime).toString() 
        : new Date().toString();

    // 3. Heuristic fallback if no API key is configured
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
        console.log('[AI Service] No valid API key configured. Executing local heuristic fallback.');
        return runHeuristicFallback(activities);
    }

    const systemPrompt = `You are a CRM sales priority intelligence agent. Your job is to analyze the interaction history (activities and notes) of a sales lead and classify it into one of three priority levels:
1. 'red': High Priority / Critical Action Needed. Use this if there has been zero meaningful interaction, contact attempts have failed, or there is an urgent/neglected situation.
2. 'yellow': Medium Priority / Follow-up Missing. Use this if some interaction has occurred, but no follow-up meeting or reminder is currently scheduled or confirmed, meaning the sales pipeline is stuck.
3. 'green': Low Priority / Confirmed. Use this if a future follow-up meeting, call, or action is successfully scheduled and confirmed.

In addition, you must extract any upcoming follow-up date and time mentioned in the latest notes.
Use the current time context for relative date extraction (e.g. "tomorrow", "tonight", "next Monday", "in 2 hours").
Current local time is: ${currentTimeString}

You MUST return a valid JSON object matching the following structure EXACTLY:
{
  "priority": "red" | "yellow" | "green",
  "reason": "A concise, single-sentence summary explaining why this priority was chosen.",
  "extractedReminderDate": "ISO-8601 Datetime String of the next scheduled follow-up" | null
}
Ensure there is no markdown code formatting, no backticks, no comments, just raw JSON.`;

    const userPrompt = `Analyze the following interaction history notes:\n\n${notesText || '[No interaction history]'}`;

    try {
        if (provider === 'openai') {
            const response = await axios.post('https://api.openai.com/v1/chat/completions', {
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                response_format: { type: 'json_object' },
                temperature: 0.2
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                timeout: 10000
            });

            const resultText = response.data.choices[0].message.content;
            const parsed = JSON.parse(resultText.trim());
            return {
                priority: parsed.priority || 'red',
                reason: parsed.reason || 'Analyzed via OpenAI.',
                extractedReminderDate: parsed.extractedReminderDate || null
            };
        } else {
            const response = await axios.post(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
                {
                    contents: [
                        {
                            role: 'user',
                            parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }]
                        }
                    ],
                    generationConfig: {
                        responseMimeType: 'application/json',
                        temperature: 0.2
                    }
                },
                {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 10000
                }
            );

            const resultText = response.data.candidates[0].content.parts[0].text;
            const parsed = JSON.parse(resultText.trim());
            return {
                priority: parsed.priority || 'red',
                reason: parsed.reason || 'Analyzed via Gemini.',
                extractedReminderDate: parsed.extractedReminderDate || null
            };
        }
    } catch (err) {
        console.error('[AI Service] Request failed, reverting to local heuristic parser:', err.message);
        return runHeuristicFallback(activities);
    }
}

/**
 * Basic pattern matcher to parse priority locally if API keys are absent.
 */
function runHeuristicFallback(activities) {
    if (!activities || activities.length === 0) {
        return {
            priority: 'red',
            reason: 'No interaction history or conversation recorded for this lead.',
            extractedReminderDate: null
        };
    }

    const latest = activities[activities.length - 1];
    const text = (latest.content || '').toLowerCase();

    // Check if the latest activity text mentions scheduling a follow-up
    const hasScheduledKeywords = /\b(confirm|schedule|talk at|meet|tomorrow|next week|later|remind|call at|at \d+|at:\s*\d+)\b/i.test(text);

    if (hasScheduledKeywords) {
        let extractedDate = null;
        const now = new Date();
        
        if (text.includes('tomorrow')) {
            const tomorrow = new Date(now);
            tomorrow.setDate(now.getDate() + 1);
            tomorrow.setHours(10, 0, 0, 0);
            extractedDate = tomorrow.toISOString();
        } else if (text.includes('tonight')) {
            const tonight = new Date(now);
            tonight.setHours(21, 0, 0, 0);
            extractedDate = tonight.toISOString();
        } else if (text.includes('next week')) {
            const nextWeek = new Date(now);
            nextWeek.setDate(now.getDate() + 7);
            nextWeek.setHours(10, 0, 0, 0);
            extractedDate = nextWeek.toISOString();
        }

        return {
            priority: 'green',
            reason: `Heuristic: Found follow-up signals in notes: "${latest.content.slice(0, 40)}...".`,
            extractedReminderDate: extractedDate
        };
    }

    return {
        priority: 'yellow',
        reason: 'Heuristic: Interaction history exists, but no upcoming follow-up is confirmed.',
        extractedReminderDate: null
    };
}

module.exports = {
    analyzeLeadPriorityAndExtractReminder
};
