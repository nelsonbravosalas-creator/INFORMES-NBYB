import { AdminSettings, ClientRecord, SubBranch } from "../types";

export const catalogKey = (value: string) => value.trim().toLocaleLowerCase();

export const findClientRecord = (settings: AdminSettings, name: string) =>
  settings.clientRecords?.find(client => catalogKey(client.name) === catalogKey(name));

export const branchOptionLabel = (branchRecord: SubBranch) =>
  [branchRecord.code, branchRecord.name].filter(Boolean).join(" - ");

const branchCatalogKeys = (branchRecord: SubBranch) => [
  branchRecord.id,
  branchRecord.name,
  branchRecord.code,
  branchRecord.address,
  branchOptionLabel(branchRecord),
].filter(Boolean).map(catalogKey);

export const findBranchRecord = (settings: AdminSettings, clientName: string, branchName: string) => {
  const branchKey = catalogKey(branchName || "");
  if (!branchKey) return undefined;

  return findClientRecord(settings, clientName)?.subs?.find(branch =>
    branchCatalogKeys(branch).includes(branchKey)
  );
};

export const getClientBranches = (settings: AdminSettings, clientName: string) => {
  const clientRecord = findClientRecord(settings, clientName);
  const catalogBranches = clientRecord?.noSubs
    ? []
    : (clientRecord?.subs || []).map(branchOptionLabel);
  const legacyBranches = settings.branches[clientName] || [];

  return Array.from(new Set([...catalogBranches, ...legacyBranches].filter(Boolean)));
};

export const branchLabel = (
  clientRecord: ClientRecord | undefined,
  branchRecord: SubBranch | undefined,
  fallback = ""
) =>
  clientRecord?.noSubs
    ? (clientRecord.address || clientRecord.name || fallback)
    : (branchRecord ? branchOptionLabel(branchRecord) : fallback);

export const getLinkedServiceOrderClientDetails = (
  settings: AdminSettings,
  clientName: string,
  branchLocation: string
) => {
  const clientRecord = findClientRecord(settings, clientName);
  const branchRecord = findBranchRecord(settings, clientName, branchLocation);

  if (!clientRecord) {
    return {
      clientId: "",
      branchId: "",
      siteId: "",
      clientContactName: "",
      clientContactRole: "",
      clientLocationAddress: "",
    };
  }

  const useClientContact = clientRecord.noSubs || !branchRecord || branchRecord.sameContact;

  return {
    clientId: clientRecord.id || "",
    branchId: clientRecord.noSubs ? "" : (branchRecord?.id || ""),
    siteId: clientRecord.noSubs ? "" : (branchRecord?.id || ""),
    clientContactName: useClientContact ? clientRecord.contactPerson : (branchRecord.contactPerson || clientRecord.contactPerson),
    clientContactRole: useClientContact ? clientRecord.contactRole : (branchRecord.contactRole || clientRecord.contactRole),
    clientLocationAddress: clientRecord.noSubs ? clientRecord.address : (branchRecord?.address || clientRecord.address),
  };
};
