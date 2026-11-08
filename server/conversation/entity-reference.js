import {normalize} from '../persistence/database.js';

export const hasUnboundReference = text => /\b(?:ele|ela|eles|elas|dele|dela|deles|delas|isso|isto|aquilo)\b/.test(normalize(text));
