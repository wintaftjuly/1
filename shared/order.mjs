// Change only the order inside a year; other years retain their slots and data.
export function reorderWithinYear(rows,sourceId,targetId,after=false) {
 const source=rows.find(row=>row.id===sourceId),target=rows.find(row=>row.id===targetId);
 if(!source||!target||source===target||source.year!==target.year)return rows;
 const group=rows.filter(row=>row.year===source.year&&row.id!==sourceId);
 group.splice(group.findIndex(row=>row.id===targetId)+(after?1:0),0,source);
 let i=0;return rows.map(row=>row.year===source.year?group[i++]:row);
}
