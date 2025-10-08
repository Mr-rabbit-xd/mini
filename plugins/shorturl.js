
const { plugin, mode, fetchJson, isUrl } = require('../lib');

plugin({
    pattern: 'short ?(.*)',
    fromMe: mode,
    desc: 'Shorten long URLs',
    type: 'utility',
    react: '🔗'
}, async (message, match) => {
    try {
        const url = match || message.reply_message?.text;
        
        if (!url) {
            return await message.send('*Please provide a URL to shorten*\n\n*Example:* .short https://example.com');
        }

        if (!isUrl(url)) {
            return await message.send('*Please provide a valid URL*\n\nMake sure it starts with http:// or https://');
        }

        // Using TinyURL API (free)
        const shortUrl = `https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`;
        
        const response = await fetch(shortUrl);
        const shortenedUrl = await response.text();
        
        if (shortenedUrl.includes('Error')) {
            return await message.send('*Failed to shorten URL*\nPlease check if the URL is valid and accessible.');
        }

        const result = `*🔗 URL Shortened Successfully*\n\n` +
            `*Original:* ${url}\n` +
            `*Shortened:* ${shortenedUrl}\n\n` +
            `> © Gᴇɴᴇʀᴀᴛᴇᴅ ʙʏ 〆͎ＭＲ－Ｒａｂｂｉｔ💀`;

        await message.send(result);

    } catch (error) {
        console.error('URL Shortener error:', error);
        await message.send('*Failed to shorten URL*\nPlease try again later.');
    }
});

plugin({
    pattern: 'expand ?(.*)',
    fromMe: mode,
    desc: 'Expand shortened URLs',
    type: 'utility',
    react: '🔍'
}, async (message, match) => {
    try {
        const url = match || message.reply_message?.text;
        
        if (!url) {
            return await message.send('*Please provide a shortened URL to expand*\n\n*Example:* .expand https://tinyurl.com/abc123');
        }

        if (!isUrl(url)) {
            return await message.send('*Please provide a valid URL*');
        }

        // Follow redirects to get final URL
        const response = await fetch(url, { 
            method: 'HEAD',
            redirect: 'follow'
        });
        
        const expandedUrl = response.url;
        
        const result = `*🔍 URL Expanded Successfully*\n\n` +
            `*Shortened:* ${url}\n` +
            `*Expanded:* ${expandedUrl}\n\n` +
            `> © Gᴇɴᴇʀᴀᴛᴇᴅ ʙʏ 〆͎ＭＲ－Ｒａｂｂｉｔ💀`;

        await message.send(result);

    } catch (error) {
        console.error('URL Expander error:', error);
        await message.send('*Failed to expand URL*\nThe URL might be invalid or inaccessible.');
    }
});
