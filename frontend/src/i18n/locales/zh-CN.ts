import enUS from './en-US';

/** Chinese source keys preserve the original interface copy. */
const zhCN: Record<string, string> = Object.fromEntries(Object.keys(enUS).map((key) => [key, key]));
export default zhCN;
