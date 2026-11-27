import { createContext } from 'react';

/**
 * The authentication context.
 *
 * It is kept in its own file so that the context object and the hook can be imported without
 * pulling in a React component.
 */
export const AuthContext = createContext(null);
