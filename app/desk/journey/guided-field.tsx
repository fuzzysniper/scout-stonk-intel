import type {Issue} from '../../../lib/unfarmd-risk';
import {friendlyIssue} from './model';
import {fieldForIssue} from './sequence';
import styles from './guided.module.css';
type Props={name:string;errorName?:string;label:string;value:string;change:(name:string,value:string)=>void;help?:string;rows?:number;numeric?:boolean;type?:'datetime-local';options?:readonly (readonly [string,string])[];issues:Issue[]};
export default function GuidedField({name,errorName,label,value,change,help,rows,numeric,type,options,issues}:Props){
 const error=issues.find(i=>i.severity==='error'&&fieldForIssue(i)===(errorName??name));
 const props={id:`journey-${name}`,value,onChange:(e:React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>)=>change(name,e.target.value),'aria-invalid':error?true:undefined,'aria-describedby':[help?`help-${name}`:'',error?`error-${name}`:''].filter(Boolean).join(' ')||undefined};
 return <div className={styles.field}><label htmlFor={props.id}>{label}</label>
 {options?<select {...props}><option value="">Choose…</option>{options.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>:rows?<textarea {...props} rows={rows} maxLength={2000} autoComplete="off"/>:<input {...props} type={type??'text'} inputMode={numeric?'decimal':undefined} step={type?'0.001':undefined} maxLength={name==='asset'?160:240} autoComplete="off" spellCheck={false}/>}
 {help&&<p id={`help-${name}`} className={styles.hint}>{help}</p>}{error&&<p id={`error-${name}`} className={styles.error}>{friendlyIssue(error)}</p>}
 </div>;
}
