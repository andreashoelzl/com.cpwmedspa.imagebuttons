import { startCrawl } from './crawl.js';

startCrawl()
    .then(result => {
        console.log('Crawl completed successfully:', result);
    })
    .catch(error => {
        console.error('Crawl failed:', error);
    });
