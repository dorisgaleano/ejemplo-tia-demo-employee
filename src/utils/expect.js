/**
 * @file expect de @playwright/test configurado con el timeout de la suite.
 * Capa: utils. Las aserciones web-first (toBeVisible, toHaveText, toHaveURL...) reintentan
 * solas hasta TIMEOUTS.expect: sincronizan sin esperas fijas. Steps y Questions importan
 * este expect, no el de @playwright/test directamente, para usar siempre el mismo límite.
 */
import { expect as baseExpect } from '@playwright/test';
import { TIMEOUTS } from '../config/env.js';

export const expect = baseExpect.configure({ timeout: TIMEOUTS.expect });
