import type {Issue} from '../../../lib/unfarmd-risk';
import {friendlyIssue,issueField} from './model';
import styles from './journey.module.css';
export type ControlProps={name:string;label:string;value:string;change:(name:string,value:string)=>void;help?:string;rows?:number;mode?:'decimal'|'numeric';type?:'datetime-local';options?:readonly (readonly [string,string])[];issues:Issue[]};
export function Control({name,label,value,change,help,rows,mode,type,options,issues}:ControlProps){
 const error=issues.find(i=>issueField(i)===name&&i.severity==='error');
 const props={id:`journey-${name}`,value,onChange:(e:React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>)=>change(name,e.target.value),'aria-invalid':error?true:undefined,'aria-describedby':[help?`help-${name}`:'',error?`error-${name}`:''].filter(Boolean).join(' ')||undefined};
 return <div className={styles.field}><label htmlFor={props.id}>{label}</label>
  {options?<select {...props}><option value="">Choose…</option>{options.map(([key,text])=><option key={key} value={key}>{text}</option>)}</select>:rows?<textarea {...props} rows={rows} autoComplete="off" maxLength={2000}/>:<input {...props} type={type??'text'} inputMode={mode} autoComplete="off" step={type?'1':undefined} maxLength={name==='asset'?160:240} spellCheck={false}/>}
  {help&&<p className={styles.help} id={`help-${name}`}>{help}</p>}{error&&<p className={styles.error} id={`error-${name}`}>{friendlyIssue(error)}</p>}
 </div>;
}
