export default Object.values(
  cybozu.data.page.FORM_DATA.schema.table.fieldList
).reduce((map, field) => ({ ...map, [field.var]: field }), {});
