export const main = async (event: { message: string }) => {
  console.info({ event });

  return { data: event.message };
};
