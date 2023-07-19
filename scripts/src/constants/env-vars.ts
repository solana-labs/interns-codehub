import * as dotenv from 'dotenv'
import joi from 'joi'
import * as path from 'path'

dotenv.config({ path: path.join(__dirname, '../../.env') })

const envVarsSchema = joi
  .object()
  .keys({
    RPC_ENDPOINT_MAINNET_BETA: joi
      .string()
      .required()
      .description('RPC endpoint for mainnet-beta'),
  })
  .unknown()

const { value: envVars, error } = envVarsSchema
  .prefs({ errors: { label: 'key' } })
  .validate(process.env)

if (error) {
  throw new Error(`Config validation error: ${error.message}`)
}

export default {
  rpcEndpointMainnetBeta: envVars.RPC_ENDPOINT_MAINNET_BETA,
} as {
  rpcEndpointMainnetBeta: string
}
