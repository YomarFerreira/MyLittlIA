import { normalize } from '../persistence/database.js';
import { displayEntity } from './semantic-catalog.js';
/** O ID técnico nunca é exibido como nome. O dicionário canônico está no SQLite. */
export function readableName(value,db=null) {
  const id=normalize(String(value).replaceAll('_',' '));
  const registered=displayEntity(db,id);
  if(registered)return registered.display_name;
  return id.split(' ').map((word,i)=>i>0&&['de','do','da','dos','das','e'].includes(word)?word:word[0]?.toLocaleUpperCase('pt-BR')+word.slice(1)).join(' ');
}
export function articleForEntity(value,db=null) {
  return displayEntity(db,value)?.article || 'de';
}
