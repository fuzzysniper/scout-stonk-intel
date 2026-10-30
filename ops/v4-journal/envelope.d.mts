export type WrappedOwnerKey=Readonly<{version:string;ownerId:string;dekId:string;kekId:string;nonce:string;ciphertext:string;tag:string}>;
export function unwrapOwnerKey(ownerId:string,envelope:WrappedOwnerKey,kek:Readonly<{id:string;key:Uint8Array}>):Readonly<{id:string;key:Uint8Array}>;
