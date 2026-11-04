// Owner has NOT authorized database execution. Environment variables cannot enable it.
// A later reviewed commit must pin exact validation code/installer SHA and explicit owner GO.
export const LOCAL_PG18_APPROVAL=null;
export function requireLocalPg18Approval(){if(LOCAL_PG18_APPROVAL===null)throw Error('LOCAL_PG18_SQL_NOT_AUTHORIZED');}
