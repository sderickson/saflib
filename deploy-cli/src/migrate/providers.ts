/**
 * Provider-specific wording for the steps a person does by hand (creating the
 * machine, finding the disk, moving the address). Chosen by
 * SAF_MIGRATE_PROVIDER; unset gives generic wording.
 */
export interface ProviderHints {
  /** Checklist lines for creating the machine, after the image/architecture/disk lines. */
  machine: string[];
  /** Example data-disk device path. */
  diskExample: string;
  /** Extra note about the data disk (e.g. a console option that formats it). */
  diskNote?: string;
  /** How to move the static address (manual commands). */
  addressMove: string[];
}

const GENERIC: ProviderHints = {
  machine: [
    "  - HTTP and HTTPS allowed in the firewall; the same access to other services as the old machine",
    "  - a temporary public address. The static one moves over during the window",
  ],
  diskExample: "/dev/sdb",
  addressMove: [
    "Move the old machine's static public address to the new machine in your",
    "provider's console (unassign it from the old machine, assign it to the new one).",
  ],
};

export const PROVIDERS: Record<string, ProviderHints> = {
  generic: GENERIC,
  gcp: {
    machine: [
      "  - HTTP and HTTPS allowed; the same service account as the old VM",
      "  - a temporary external address. The static address moves over during the window",
    ],
    diskExample: "/dev/nvme0n2 (or /dev/disk/by-id/google-<disk-name>)",
    addressMove: [
      "Move the old machine's static external address to the new machine. On GCP",
      "(check the access config's name with `gcloud compute instances describe <vm>`):",
      '  gcloud compute instances delete-access-config <old-vm> --access-config-name="External NAT" --zone=<zone>',
      '  gcloud compute instances delete-access-config <new-vm> --access-config-name="External NAT" --zone=<zone>',
      '  gcloud compute instances add-access-config <new-vm> --access-config-name="External NAT" --address=<static-ip> --zone=<zone>',
    ],
  },
  digitalocean: {
    machine: [
      "  - a Droplet in the same region as the old one, with the same Cloud Firewall (HTTP, HTTPS, SSH)",
      "  - its own public address for now. The Reserved IP moves over during the window",
    ],
    diskExample: "/dev/disk/by-id/scsi-0DO_Volume_<volume-name>",
    diskNote:
      'If you created the Volume with "Automatically format & mount", it\'s already formatted and mounted under /mnt: unmount it, then mount it at the data directory with the fstab line below (skip mkfs).',
    addressMove: [
      "Move the Reserved IP to the new Droplet (console: Networking → Reserved IPs), or:",
      "  doctl compute reserved-ip-action unassign <reserved-ip>",
      "  doctl compute reserved-ip-action assign <reserved-ip> <new-droplet-id>",
    ],
  },
  hetzner: {
    machine: [
      "  - a server in the same location as the old one, with the same Firewall (HTTP, HTTPS, SSH)",
      "  - its own public address for now. The Floating IP moves over during the window",
    ],
    diskExample: "/dev/disk/by-id/scsi-0HC_Volume_<volume-id>",
    diskNote:
      "If you created the Volume with automatic formatting and mounting, it's already mounted under /mnt: unmount it, then mount it at the data directory with the fstab line below (skip mkfs).",
    addressMove: [
      "Move the Floating IP to the new server (console: the IP's Assign button), or:",
      "  hcloud floating-ip unassign <floating-ip>",
      "  hcloud floating-ip assign <floating-ip> <new-server>",
      "(The new server needs the Floating IP configured on its interface, as the old one did.)",
    ],
  },
};

/** Hints for `name` (case-insensitive); unknown or unset names get generic wording. */
export function providerHints(name: string | undefined): ProviderHints {
  return PROVIDERS[(name ?? "generic").toLowerCase()] ?? GENERIC;
}
