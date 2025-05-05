const { OpenAI } = require('langchain/llms/openai');
const { PromptTemplate } = require('langchain/prompts');
const { SqliteCache } = require('../utils/sqliteCache');

async function analyzeCoin(message, plugins, config) {
    const model = new OpenAI({
        temperature: 0.7,
        modelName: 'gpt-3.5-turbo'
    });

    const cache = new SqliteCache();
    
    // Process through each plugin
    let context = '';
    for (const plugin of plugins) {
        const pluginData = await plugin.process(message);
        if (pluginData) {
            context += pluginData + '\n';
        }
    }

    const promptTemplate = new PromptTemplate({
        template: `
        Analyze the following cryptocurrency data and provide insights:
        Context: {context}
        User Message: {message}
        
        Provide a detailed analysis including:
        1. Technical Analysis
        2. Market Sentiment
        3. Recommendations
        `,
        inputVariables: ['context', 'message']
    });

    const prompt = await promptTemplate.format({
        context,
        message
    });

    const response = await model.call(prompt);
    await cache.set(message, response);
    
    return response;
}

module.exports = { analyzeCoin };