# SfnSyncToSST POC

```bash
pnpm i
pnm run deploy -- or pnpm run dev
```

Then use the sync-ext to save a updates to `stack/def.json`.
When the sst deployment is retriggered it should replace the dynamic
values in `def.json` with the options outlined in `stack/MyStack.ts`
