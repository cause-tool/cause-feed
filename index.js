'use strict';

const _ = require('lodash');
const request = require('request');
const FeedParser = require('feedparser');
const validator = require('validator');
const scrapingUtils = require('cause-utils/scraping');
const feedUtils = require('cause-utils/feed');


function requestFeed(reqOpts, errorHandler) {
	if (!validator.isURL(reqOpts.url)) {
		errorHandler(new Error(`not a valid url: ${reqOpts.url}`));
	}

	const feedparser = new FeedParser();
	feedparser.on('error', errorHandler);

	const req = request(reqOpts);
	req.on('error', errorHandler);
	req.on('response', (res) => {
		if (res.statusCode !== 200) {
			context.debug(`status code: ${res.statusCode}`, context.task.name);
			context.debug(reqOpts.url);
			return;
		}
		res.pipe(feedparser);
	});

	return feedparser;
}


function main(step, context, config, input, done) {
	const reqOpts = _.defaults(
		{ url: config.url },
		scrapingUtils.requestDefaults()
	);
	const feedparser = requestFeed(reqOpts, (err) => {
		context.debug(err);
		return done(err);
	});

	feedUtils.processFeed(
		feedparser, {
			seenGuids: step.data.seenGuids,
			seenPubdate: step.data.seenPubdate
		},
		(err, result) => {
			if (err) {
				return done(err);
			}

			const output = result.newItems;
			const newOnes = (result.newItems.length > 0);
			done(null, output, newOnes);

			step.data.seenGuids = result.guids;
			step.data.seenPubdate = result.meta['pubdate'];
			context.saveTask();
		}
	);
}


module.exports = {
	requestFeed: requestFeed,
	main: main,
	defaults: {
		config: {},
		data: {
			seenPubdate: null,
			seenGuids: []
		},
		description: 'new rss item(s)'
	}
};
