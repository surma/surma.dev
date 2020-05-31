---json
{
"title": "DIY Backup Server",
"date": "2020-05-30",
"live": false
}
---

I decided to build my own data storage / backup server.

<!-- more -->

Partlist
- SSD
- 4x SATA to USB
- NUC 10 Kit
- 256GB NVMe

## RAID

1. LVM
2. MD
3. LVM

### Setup

#### Start with Raid1
```
pvcreate /dev/device0
pvcreate /dev/device1
pvs
vgcreate slices /dev/device{0,1}
# Take the smallest device first
lvcreate -l100%PVS -n disk0-slice0 slices /dev/device0
# Get resulting size
lvs 
lvcreate -L1020m -n disk1-slice0 slices /dev/device1
mdadm --create /dev/md/raid0 -l 1 -n 2 /dev/slices/*-slice0
mdadm --detail --scan > mdadm.conf
pvcreate /dev/md/raid0
vgcreate raid /dev/md/raid0
lvcreate -l100%FREE -n photos raid
mkfs.ext4 /dev/raid/photos
mount /dev/raid/photos /mnt/photos
```

#### Get a third disk. RAID5 + RAID1

```
pvcreate /dev/device2
vgextend slices /dev/device2
lvcreate -L1020m -n disk2-slice0 slices /dev/device2
mdadm /dev/md/raid0 --add /dev/slices/disk2-slice0
mdadm --groww /dev/md/raid0 -l5 -n3 
pvresize /dev/md/raid0

# Create the new RAID1
mdadm --create /dev/md/raid1 -l 1 -n 2 /dev/slices/*-slice1
mdadm --detail --scan > mdadm.conf
pvcreate /dev/md/raid0
vgextend raid /dev/md/raid1
lvresize -l +100%FREE /dev/raid/photos
resize2fs /dev/raid/photos
```

## A disk breaks

`/dev/device0` breaks, and gets replaced with a 3GB drive.

```
vgreduce --removemissing --force slices
pvcreate /dev/new-device0
vgextend slices /dev/new-device0
vgchange -ay
lvcreate -L1020m -n disk0-slice0 slices /dev/new-device0
lvcreate -L1g -n disk0-slice1 slices /dev/new-device0
mdadm /dev/md/raid0 --add /dev/slices/disk0-slice0
# Upgrade RAID1 to RAID5
mdadm /dev/md/raid1 --add /dev/slices/disk0-slice1
pvresize /dev/raid1
lvresize -l +100%FREE /dev/raid/photos
resize2fs /dev/raid/photos
# Add a new RAID1
lvcreate -L 1g -n disk0-slice2 slices /dev/device0
lvcreate -L 1g -n disk2-slice2 slices /dev/device2
mdadm --create /dev/md/raid2 -l1 -n2 /dev/slices/*-slice2
pvcreate /dev/md/raid2
vgextend /dev/md/raid2
lvresize -l +100%FREE /dev/raid/photos
resize2fs /dev/raid/photos
```

## Add a 4th disk

```
pvcreate /dev/device3
vgextend slices /dev/device2
lvcreate -L1020m -n disk3-slice0 slices /dev/device3
lvcreate -L1g -n disk3-slice1 slices /dev/device3
lvcreate -L1g -n disk3-slice2 slices /dev/device3
mdadm /dev/md/raid0 --add /dev/slices/disk3-slice0
mdadm --grow /dev/md/raid0 -l5 -n4 
mdadm /dev/md/raid1 --add /dev/slices/disk3-slice1
mdadm --grow /dev/md/raid1 -l5 -n4 
mdadm /dev/md/raid2 --add /dev/slices/disk3-slice2
mdadm --grow /dev/md/raid1 -l5 -n3
pvresize /dev/md/raid*
lvresize -l +100%FREE /dev/raid/photos
resize2fs /dev/raid/photos
```

