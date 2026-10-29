// Original CSS selectors are preserved in the offline bundle, no image processing.
module.exports=function(source){const names=Object.fromEntries([...source.matchAll(/\.([a-zA-Z_][\w-]*)/g)].map(m=>[m[1],m[1]]));return 'module.exports='+JSON.stringify(names);};
