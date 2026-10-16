// English translation — must have exactly the keys of ../vi (enforced by the type).
import type { Translation } from '../vi';
import common from './common';
import auth from './auth';
import workspace from './workspace';
import admin from './admin';

const en: Translation = { ...common, ...auth, ...workspace, ...admin };

export default en;
