import {describe,it,expect} from 'vitest';
import {canTransition,httpUrl,isValidColumnId} from '../lib/validation';
describe('workflow security',()=>{
 it('blocks self-approval',()=>expect(canTransition('submitted','approved','owner',true,false)).toBe(false));
 it('blocks creator approval',()=>expect(canTransition('submitted','approved','owner',false,true)).toBe(false));
 it('allows independent manager review',()=>expect(canTransition('submitted','approved','manager',false,false)).toBe(true));
 it('blocks unsigned submission by third party',()=>expect(canTransition('todo','submitted','member',false,false)).toBe(false));
 it('requires safe URLs',()=>{
  expect(httpUrl.safeParse('javascript:alert(1)').success).toBe(false);
  expect(httpUrl.safeParse('https://example.com').success).toBe(true);
 });
 it('rejects unsafe dynamic field keys',()=>expect(isValidColumnId('__proto__')).toBe(false));
});
import {parseCsv,rowsToObjects} from '../lib/keyword-csv';
describe('CSV safety',()=>{
 it('parses quotes, escaped quotes and CRLF',()=>{
 const rows=parseCsv('keyword,cluster_name\r\n"audit, tools","say ""hello"""\r\n');
 expect(rowsToObjects(rows)[0]).toEqual({keyword:'audit, tools',cluster_name:'say "hello"'});
 });
 it('rejects unterminated quotations',()=>expect(()=>parseCsv('keyword\n"missing')).toThrow());
});
