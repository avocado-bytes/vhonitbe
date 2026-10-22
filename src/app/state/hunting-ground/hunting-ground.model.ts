/**
 * Why looking up or keeping a hunting ground failed:
 * no known position, the service could not be reached, the kept hunting ground is no longer found there, or it could not be stored
 */
export type HuntingGroundError = 'location' | 'service' | 'missing' | 'storage';
