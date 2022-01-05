import * as http from 'http';
import * as https from 'http';
import { Headers, Request, RequestInit, Response } from 'node-fetch';

export type FetchOptions = RequestInit & {
	agent?: https.Agent | http.Agent;
};

export type Fetch = (
	url: string | Request,
	options?: FetchOptions
) => Promise<Response>;

export type FetchModule = {
	default: Fetch;
	Headers: typeof Headers;
};

export default function createFetch(fetchModule?: FetchModule): (
    url: string | Request,
    init?: RequestInit
) => Promise<Response>;
