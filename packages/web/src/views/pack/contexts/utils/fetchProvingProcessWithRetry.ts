import type { ParsedAccount, StringPublicKey } from '@oyster/common';
import { getUnixTs, sleep } from '@oyster/common';
import type { ProvingProcess } from '@oyster/common/dist/lib/models/packs/accounts/ProvingProcess';
import { getProvingProcessByPubkey } from '@oyster/common/dist/lib/models/packs/accounts/ProvingProcess';
import type { Connection } from '@solana/web3.js';

interface FetchProvingProcessWithRetryParameters {
  provingProcessKey: StringPublicKey;
  connection: Connection;
}

const SLEEP_TIMEOUT = 300;
const REQUEST_TIMEOUT = 15_000;

export const fetchProvingProcessWithRetry = async ({
  provingProcessKey,
  connection,
}: FetchProvingProcessWithRetryParameters): Promise<
  ParsedAccount<ProvingProcess>
> => {
  let provingProcess;
  const startTime = getUnixTs();

  while (!provingProcess && getUnixTs() - startTime < REQUEST_TIMEOUT) {
    try {
      provingProcess = await getProvingProcessByPubkey(
        connection,
        provingProcessKey,
      );
    } catch {
      // skip
    }

    await sleep(SLEEP_TIMEOUT);
  }

  return provingProcess;
};
